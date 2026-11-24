"""Seed FiftyOne with realistic datasets built from Ultralytics' COCO128 /
COCO128-seg images (real COCO train2017 photos + their real labels).

Simulates a computer-vision team's workspace after months of use: several
datasets with ground truth, model predictions from two model versions,
evaluations, tags, review-status fields, saved views, and embeddings
visualizations.

Run with the env from env.sh and mongod running.
"""

import os
import random
from datetime import datetime, timedelta

import numpy as np
from PIL import Image

import fiftyone as fo
import fiftyone.brain as fob
from fiftyone import ViewField as F

UIC = os.environ["UIC"]
MEDIA = os.path.join(UIC, "media")

COCO = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train",
    "truck", "boat", "traffic light", "fire hydrant", "stop sign",
    "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
    "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag",
    "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite",
    "baseball bat", "baseball glove", "skateboard", "surfboard",
    "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon",
    "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot",
    "hot dog", "pizza", "donut", "cake", "chair", "couch", "potted plant",
    "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote",
    "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush",
]

CONFUSIONS = {
    "car": "truck", "truck": "car", "bus": "truck", "cat": "dog",
    "dog": "cat", "cup": "bowl", "bowl": "cup", "couch": "chair",
    "chair": "couch", "horse": "cow", "cow": "sheep", "sheep": "cow",
    "motorcycle": "bicycle", "bicycle": "motorcycle", "handbag": "backpack",
    "backpack": "handbag", "donut": "cake", "orange": "apple",
    "knife": "fork", "tv": "laptop", "laptop": "tv", "remote": "cell phone",
}

ANNOTATORS = ["priya.n", "marcus.o", "jlee", "s.okafor", "dana.k", "tomasz.w"]
CAMERAS = ["Canon EOS 5D", "iPhone 12 Pro", "Pixel 6", "Nikon D750",
           "Sony A7 III", "GoPro HERO9", None]
LOCATIONS = [
    ("San Francisco, CA", [-122.4194, 37.7749]),
    ("Austin, TX", [-97.7431, 30.2672]),
    ("Brooklyn, NY", [-73.9442, 40.6782]),
    ("Seattle, WA", [-122.3321, 47.6062]),
    ("Chicago, IL", [-87.6298, 41.8781]),
    ("Denver, CO", [-104.9903, 39.7392]),
    ("Toronto, ON", [-79.3832, 43.6532]),
    ("London, UK", [-0.1276, 51.5072]),
]
NOTES = [
    "Heavy occlusion on left side; box is best-effort.",
    "Motion blur.",
    "Low light, objects in background barely visible.",
    "Crowd scene - only labeled foreground people per guideline 3.2",
    "Reflections in window may confuse the model",
    "",
    "",
    "",
    "Check with Priya: is the plushie a teddy bear or 'other'?",
    "Truncated at image border",
    "re-annotated after QA round 2",
    "Partial view of dining table; ambiguous extent. Flagged for guideline review.",
    "dup? looks very similar to 000000000092",
]

rng = random.Random(51)
nrng = np.random.default_rng(51)


def parse_det(path):
    out = []
    if not os.path.exists(path):
        return out
    for line in open(path):
        p = line.split()
        if len(p) < 5:
            continue
        c = int(p[0])
        xc, yc, w, h = map(float, p[1:5])
        out.append((COCO[c], [xc - w / 2, yc - h / 2, w, h]))
    return out


def parse_seg(path):
    out = []
    if not os.path.exists(path):
        return out
    for line in open(path):
        p = line.split()
        if len(p) < 7:
            continue
        c = int(p[0])
        pts = list(map(float, p[1:]))
        out.append((COCO[c], list(zip(pts[0::2], pts[1::2]))))
    return out


def clip_box(b):
    x, y, w, h = b
    x = max(0.0, min(1.0, x))
    y = max(0.0, min(1.0, y))
    w = max(0.005, min(1.0 - x, w))
    h = max(0.005, min(1.0 - y, h))
    return [x, y, w, h]


def predict(gts, quality):
    """Simulate a detector: jitter boxes, drop some, confuse some, add FPs."""
    preds = []
    for label, box in gts:
        area = box[2] * box[3]
        miss_p = (0.35 if area < 0.004 else 0.08) * (1.6 - quality)
        if rng.random() < miss_p:
            continue
        j = 0.06 * (1.4 - quality)
        x, y, w, h = box
        nb = clip_box([
            x + rng.gauss(0, j) * w, y + rng.gauss(0, j) * h,
            w * (1 + rng.gauss(0, j)), h * (1 + rng.gauss(0, j)),
        ])
        lab = label
        if label in CONFUSIONS and rng.random() < 0.18 * (1.5 - quality):
            lab = CONFUSIONS[label]
        conf = min(0.999, max(0.05, rng.betavariate(6 * quality + 2, 2)))
        if area < 0.004:
            conf *= 0.75
        preds.append((lab, nb, round(conf, 4)))
    for _ in range(np.random.poisson(1.2 * (1.5 - quality))):
        lab = rng.choice(COCO[:20] + ["chair", "cup", "bottle", "book"])
        w, h = rng.uniform(0.03, 0.25), rng.uniform(0.03, 0.3)
        preds.append((lab, clip_box([rng.random() * (1 - w), rng.random() * (1 - h), w, h]),
                      round(rng.uniform(0.06, 0.55), 4)))
    return preds


def embed(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im.resize((8, 8)), dtype=np.float32).ravel() / 255.0
    hsv = np.asarray(im.convert("HSV").resize((32, 32)), dtype=np.float32)
    hist = np.concatenate([
        np.histogram(hsv[..., i], bins=12, range=(0, 255))[0] for i in range(3)
    ]).astype(np.float32)
    hist /= hist.sum() + 1e-6
    return np.concatenate([a, hist * 4])


def images(name):
    d = os.path.join(MEDIA, name, "images", "train2017")
    return sorted(os.path.join(d, f) for f in os.listdir(d) if f.endswith(".jpg"))


def set_created(ds, when):
    ds._doc.created_at = when
    ds._doc.last_modified_at = when + timedelta(days=rng.randint(3, 60))
    ds._doc.save()


def base_samples(paths, seg=False, start=None):
    samples = []
    for i, p in enumerate(paths):
        stem = os.path.splitext(os.path.basename(p))[0]
        root = os.path.dirname(os.path.dirname(os.path.dirname(p)))
        lbl = os.path.join(root, "labels", "train2017", stem + ".txt")
        s = fo.Sample(filepath=p)
        if seg:
            polys = parse_seg(lbl)
            s["ground_truth"] = fo.Polylines(polylines=[
                fo.Polyline(label=l, points=[pts], closed=True, filled=True)
                for l, pts in polys
            ])
            gts = []
            for l, pts in polys:
                xs = [q[0] for q in pts]
                ys = [q[1] for q in pts]
                gts.append((l, [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)]))
        else:
            gts = parse_det(lbl)
            s["ground_truth"] = fo.Detections(detections=[
                fo.Detection(label=l, bounding_box=b, iscrowd=0,
                             area=round(b[2] * b[3], 5)) for l, b in gts
            ])
        loc = rng.choice(LOCATIONS)
        s["location"] = fo.GeoLocation(point=[loc[1][0] + rng.gauss(0, 0.03),
                                             loc[1][1] + rng.gauss(0, 0.03)])
        s["city"] = loc[0]
        cam = rng.choice(CAMERAS)
        s["camera"] = cam
        if start:
            s["captured_at"] = start + timedelta(
                days=rng.randint(0, 300), hours=rng.randint(6, 21),
                minutes=rng.randint(0, 59))
        s["annotator"] = rng.choice(ANNOTATORS)
        note = rng.choice(NOTES)
        if note:
            s["notes"] = note
        s["num_objects"] = len(gts)
        samples.append(s)
    return samples


def add_preds(ds, field, quality, seed):
    rng.seed(seed)
    np.random.seed(seed)
    for s in ds.iter_samples(autosave=True):
        gts = [(d.label, d.bounding_box) for d in s.ground_truth.detections]
        s[field] = fo.Detections(detections=[
            fo.Detection(label=l, bounding_box=b, confidence=c)
            for l, b, c in predict(gts, quality)
        ])


def main():
    for name in fo.list_datasets():
        fo.delete_dataset(name)

    now = datetime(2026, 11, 14, 16, 20)
    det_paths = images("coco128")

    # ------------------------------------------------------------------ #
    # 1. Main dataset: urban & everyday-objects detection benchmark
    # ------------------------------------------------------------------ #
    ds = fo.Dataset("coco-everyday-objects-v3")
    ds.persistent = True
    ds.description = (
        "128-image curated benchmark from COCO train2017 used to compare "
        "detector checkpoints before each release. Ground truth re-verified "
        "in QA round 2 (Sept 2026)."
    )
    ds.info = {
        "owner": "perception-team",
        "source": "COCO 2017 train (Ultralytics coco128 subset)",
        "label_schema": "COCO-80",
        "qa_rounds": 2,
        "jira": "PERC-1182",
    }
    ds.tags = ["benchmark", "detection", "coco", "release-gate"]
    samples = base_samples(det_paths, start=datetime(2025, 12, 1))
    ds.add_samples(samples)
    ds.compute_metadata()

    add_preds(ds, "yolo11s_v2", 0.92, 11)
    add_preds(ds, "rtdetr_l_baseline", 0.7, 22)

    # Review status / tags
    statuses = ["approved"] * 7 + ["needs_review"] * 3 + ["rejected"] + ["in_progress"] * 2
    for i, s in enumerate(ds.iter_samples(autosave=True)):
        s["review_status"] = rng.choice(statuses)
        s["difficulty"] = rng.choice(["easy", "easy", "medium", "medium", "hard"])
        s["is_night"] = rng.random() < 0.12
        tags = []
        if s.num_objects == 0:
            tags.append("no-objects")
        if s.num_objects > 12:
            tags.append("crowded")
        if rng.random() < 0.08:
            tags.append("label-error")
        if rng.random() < 0.1:
            tags.append("hard-negative")
        if i % 5 == 0:
            tags.append("validation")
        else:
            tags.append("train")
        s.tags = tags

    ds.evaluate_detections("yolo11s_v2", gt_field="ground_truth",
                           eval_key="eval_yolo11s", compute_mAP=True)
    ds.evaluate_detections("rtdetr_l_baseline", gt_field="ground_truth",
                           eval_key="eval_rtdetr", compute_mAP=True)

    # label tags on a few objects
    for s in ds.take(14, seed=3).iter_samples(autosave=True):
        dets = s.ground_truth.detections
        if dets:
            d = rng.choice(dets)
            d.tags = ["mislabeled"] if rng.random() < 0.5 else ["occluded"]

    # embeddings + visualization + uniqueness/similarity
    emb = np.stack([embed(p) for p in ds.values("filepath")])
    try:
        fob.compute_visualization(ds, embeddings=emb, method="pca",
                                  brain_key="img_viz_pca", num_dims=2)
    except Exception as e:
        print("viz failed", e)
    try:
        fob.compute_uniqueness(ds, embeddings=emb)
    except Exception as e:
        print("uniqueness failed", e)
    try:
        fob.compute_similarity(ds, embeddings=emb, brain_key="img_sim",
                               backend="sklearn")
    except Exception as e:
        print("similarity failed", e)
    try:
        fob.compute_mistakenness(ds, "yolo11s_v2", label_field="ground_truth")
    except Exception as e:
        print("mistakenness failed", e)

    # saved views
    ds.save_view("high-conf-false-positives",
                 ds.filter_labels("yolo11s_v2", (F("eval_yolo11s") == "fp") & (F("confidence") > 0.8)),
                 description="FPs above 0.8 confidence from yolo11s v2", color="#d63c3c")
    ds.save_view("needs-review", ds.match(F("review_status") == "needs_review"),
                 description="Samples flagged by QA for a second pass", color="#e8a33d")
    ds.save_view("crowded-scenes", ds.match_tags("crowded").sort_by("num_objects", reverse=True),
                 description="More than 12 GT objects")
    ds.save_view("vehicles-only",
                 ds.filter_labels("ground_truth", F("label").is_in(["car", "truck", "bus", "motorcycle", "bicycle"])),
                 description="Street vehicles subset for the ADAS sync", color="#3d7be8")
    ds.save_view("most-unique", ds.sort_by("uniqueness", reverse=True).limit(30))
    ds.save_view("label-errors", ds.match_tags("label-error"),
                 description="Suspected GT errors (PERC-1201)")
    try:
        ds.save_view("likely-mistakes", ds.sort_by("mistakenness", reverse=True).limit(25),
                     description="Top mistakenness score vs yolo11s_v2")
    except Exception as e:
        print(e)
    ds.app_config.sidebar_mode = "all"
    ds.save()
    set_created(ds, now - timedelta(days=142))
    print(ds)

    # ------------------------------------------------------------------ #
    # 2. Instance segmentation dataset
    # ------------------------------------------------------------------ #
    seg = fo.Dataset("coco-instance-seg-polygons")
    seg.persistent = True
    seg.description = "Polygon instance masks for COCO128-seg; used for the SAM2 fine-tune experiments."
    seg.tags = ["segmentation", "coco", "polygons"]
    segs = base_samples(images("coco128-seg"), seg=True, start=datetime(2026, 2, 1))
    seg.add_samples(segs)
    seg.compute_metadata()
    for s in seg.iter_samples(autosave=True):
        s["review_status"] = rng.choice(["approved", "approved", "needs_review", "in_progress"])
    seg.save_view("people-masks", seg.filter_labels("ground_truth", F("label") == "person"))
    set_created(seg, now - timedelta(days=97))

    # ------------------------------------------------------------------ #
    # 3. Smaller task-specific datasets (clones of subsets)
    # ------------------------------------------------------------------ #
    def subset(name, view, desc, tags, days_ago):
        d = view.clone(name, persistent=True)
        d.description = desc
        d.tags = tags
        d.save()
        set_created(d, now - timedelta(days=days_ago))
        return d

    subset("street-scenes-adas-pilot",
           ds.filter_labels("ground_truth", F("label").is_in(
               ["car", "truck", "bus", "motorcycle", "bicycle", "traffic light", "stop sign", "person"])),
           "Street-level subset for the ADAS pilot with Fleetline. Vehicles, pedestrians, signals.",
           ["adas", "detection", "pilot"], 63)
    subset("kitchen-and-dining",
           ds.filter_labels("ground_truth", F("label").is_in(
               ["cup", "bowl", "fork", "knife", "spoon", "bottle", "wine glass", "dining table",
                "pizza", "donut", "cake", "sandwich", "banana", "oven", "sink", "microwave", "refrigerator"])),
           "Household/kitchen objects for the home-robotics grasping demo.",
           ["robotics", "household"], 48)
    subset("animals-wildlife-mix",
           ds.filter_labels("ground_truth", F("label").is_in(
               ["cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "bird"])),
           "Animals subset - pets + wildlife. Waiting on more giraffe/zebra data from field team.",
           ["animals"], 31)
    subset("qa-round2-label-errors", ds.match_tags("label-error"),
           "Frozen snapshot of samples sent back to the vendor in QA round 2.",
           ["qa", "archived"], 74)
    subset("hard-negatives-oct", ds.match_tags("hard-negative"),
           None, ["mining"], 12)
    subset("night-low-light", ds.match(F("is_night") == True),
           "Low light captures for the night-mode augmentation study", ["lighting"], 5)

    print(fo.list_datasets())


if __name__ == "__main__":
    main()
