"""
convert_h5_to_tfjs.py — Lightweight converter from Keras H5 to TF.js format.
Generates model.json and group1-shard1of1.bin without external tfjs package dependencies.
"""

import json
from pathlib import Path
import tensorflow as tf
import numpy as np

export_dir = Path(__file__).parent / "export"
h5_path = export_dir / "model.h5"
out_dir = export_dir / "tfjs_model"
out_dir.mkdir(parents=True, exist_ok=True)

model = tf.keras.models.load_model(str(h5_path))

# Extract topology
model_json_str = model.to_json()
model_config = json.loads(model_json_str)

weights_manifest_entries = []
weight_bytes_list = []

for weight in model.weights:
    # Clean up name: remove ':0' suffix
    clean_name = weight.name.split(":")[0]
    val = weight.numpy().astype(np.float32)
    shape = list(val.shape)
    
    weights_manifest_entries.append({
        "name": clean_name,
        "shape": shape,
        "dtype": "float32"
    })
    weight_bytes_list.append(val.tobytes())

# Concatenate all weight binary buffers into one file
bin_path = out_dir / "group1-shard1of1.bin"
with open(bin_path, "wb") as f:
    for b in weight_bytes_list:
        f.write(b)

tfjs_manifest = {
    "format": "layers-model",
    "generatedBy": "keras v" + tf.__version__,
    "convertedBy": "Custom Python Converter",
    "modelTopology": model_config,
    "weightsManifest": [
        {
            "paths": ["group1-shard1of1.bin"],
            "weights": weights_manifest_entries
        }
    ]
}

model_json_path = out_dir / "model.json"
with open(model_json_path, "w") as f:
    json.dump(tfjs_manifest, f, indent=2)

print(f"[SUCCESS] Exported TF.js model to {out_dir}")
print(f"  model.json: {model_json_path.stat().st_size} bytes")
print(f"  group1-shard1of1.bin: {bin_path.stat().st_size} bytes")
