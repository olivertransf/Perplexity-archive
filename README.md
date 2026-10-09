# Perplexity archive

Local dashboard for a Perplexity data export. The export and the generated JSON stay on this machine.

```bash
npm install
npm run prepare-data
npm run dev
```

`prepare-data` looks for the export in `data/raw/`, then `$PERPLEXITY_EXPORT`, then the newest `user_data_export_*` folder in `~/Downloads`. Open the printed local URL. Do not deploy it.
