import WebSocket from '../../server/node_modules/ws/wrapper.mjs';
const ws = new WebSocket(process.argv[2]);
let think = '', text = '';
ws.on('open', () => setTimeout(() => {
  ws.send(JSON.stringify({event: 'setChatHistory', value: [{type: 'user', text: 'hi'}, {type: 'model', response: ['Hello!']}]}));
  ws.send(JSON.stringify({event: 'prompt', value: 'How do I add an index for this postgres query?'}));
}, 1500));
ws.on('message', m => {
  const {event, value} = JSON.parse(m);
  if (event === 'think-token') think += value;
  else if (event === 'token') text += value;
  else if (event === 'end') { console.log('THINK:', think, '\nTEXT:', text.slice(0, 200)); ws.close(); }
  else console.log(event, value);
});
