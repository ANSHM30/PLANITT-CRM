import app from "./src/app.js";

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`CRM API running on http://localhost:${port}`);
});
