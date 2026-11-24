// Web Bluetooth stub: stands in for a physical, already-paired ToothPaste dongle (ESP32-S3).
// navigator.bluetooth.requestDevice() resolves to a fake device exposing the ToothPaste GATT
// service (packet / HID-semaphore / MAC characteristics). On the first write (the app's
// unencrypted auth packet with its stored public key) it replies with a CHALLENGE ResponsePacket,
// like real firmware for a known peer; later writes are acknowledged with KEEPALIVE packets.
(function () {
  const SERVICE = "19b10000-e8f2-537e-4f6c-d104768a1214";
  const PKT = "6856e119-2c7b-455a-bf42-cf7ddd2c5907";
  const SEM = "6856e119-2c7b-455a-bf42-cf7ddd2c5908";
  const MAC = "19b10002-e8f2-537e-4f6c-d104768a1214";
  const DEVICE = { name: "ToothPaste Desk", mac: "f4122fa8c3d1" }; // must match a paired device in seed-data.json
  const FIRMWARE = "2.0.0";

  // ResponsePacket { responseType=1 (varint), challengeData=2 (bytes), firmwareVersion=3 (string) }
  function responsePacket(type, challenge) {
    const out = [];
    const fv = new TextEncoder().encode(FIRMWARE);
    if (type) out.push(0x08, type);
    if (challenge) out.push(0x12, challenge.length, ...challenge);
    out.push(0x1a, fv.length, ...fv);
    return new DataView(new Uint8Array(out).buffer);
  }

  function makeDevice() {
    const device = new EventTarget();
    device.id = "dGVzdC10b290aHBhc3RlLWRlc2s=";
    device.name = DEVICE.name;
    let writes = 0;

    const sem = new EventTarget();
    sem.uuid = SEM; sem.value = null;
    sem.startNotifications = async () => sem;
    sem.stopNotifications = async () => sem;
    const notify = (dv) => setTimeout(() => {
      sem.value = dv;
      const ev = new Event("characteristicvaluechanged");
      Object.defineProperty(ev, "target", { value: sem });
      sem.dispatchEvent(ev);
    }, 25);

    const pkt = new EventTarget();
    pkt.uuid = PKT;
    pkt.writeValueWithoutResponse = async () => {
      writes += 1;
      if (writes === 1) notify(responsePacket(3, Array.from(crypto.getRandomValues(new Uint8Array(16)))));
      else notify(responsePacket(0));
    };
    pkt.writeValue = pkt.writeValueWithoutResponse;
    pkt.writeValueWithResponse = pkt.writeValueWithoutResponse;

    const mac = new EventTarget();
    mac.uuid = MAC;
    mac.readValue = async () => new DataView(new Uint8Array(DEVICE.mac.match(/../g).map((h) => parseInt(h, 16))).buffer);

    const chars = { [PKT]: pkt, [SEM]: sem, [MAC]: mac };
    const service = {
      uuid: SERVICE, isPrimary: true, device,
      getCharacteristic: async (u) => { if (chars[u]) return chars[u]; throw new DOMException("No Characteristics matching UUID " + u, "NotFoundError"); },
    };
    const gatt = {
      device, connected: false,
      connect: async () => { await new Promise((r) => setTimeout(r, 300)); gatt.connected = true; writes = 0; return gatt; },
      disconnect: () => { gatt.connected = false; device.dispatchEvent(new Event("gattserverdisconnected")); },
      getPrimaryService: async (u) => { if (u === SERVICE) return service; throw new DOMException("No Services matching UUID " + u, "NotFoundError"); },
    };
    device.gatt = gatt;
    return device;
  }

  let current = null;
  const bluetooth = {
    getAvailability: async () => true,
    requestDevice: async () => { await new Promise((r) => setTimeout(r, 400)); current = current || makeDevice(); return current; },
    getDevices: async () => (current ? [current] : []),
    addEventListener() {}, removeEventListener() {},
  };
  try { Object.defineProperty(Navigator.prototype, "bluetooth", { get: () => bluetooth, configurable: true }); }
  catch (e) { Object.defineProperty(navigator, "bluetooth", { value: bluetooth, configurable: true }); }
})();
