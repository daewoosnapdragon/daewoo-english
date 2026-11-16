# Brand assets

- `source/*.png` are the six class flowers drawn in Gemini (black line on white, 1024 px).
- `source/paper-slip.webp` is the photographed paper strip on green used for toasts.

To rebuild the flower paths after replacing a drawing:

```bash
pip install scikit-image scipy
python3 scripts/brand/vectorize.py scripts/brand/source /tmp/flowers.json
python3 scripts/brand/to_ts.py /tmp/flowers.json
```

The paper slip in `public/brand/paper-slip.webp` was cut from the green with a chroma key, with green capped at the red channel to remove spill from the torn fibres, then resized to 760 px wide.
