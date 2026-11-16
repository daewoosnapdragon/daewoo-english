# Brand assets

- `source/*.png` are the six class flowers drawn in Gemini (black line on white, 1024 px).

To rebuild the flower paths after replacing a drawing:

```bash
pip install scikit-image scipy
python3 scripts/brand/vectorize.py scripts/brand/source /tmp/flowers.json
python3 scripts/brand/to_ts.py /tmp/flowers.json
```
