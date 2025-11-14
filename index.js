
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import stripeWebhook from "./routes/stripeWebhook.js";

dotenv.config();

const app = express();
app.use(cors());

// Stripe exige raw body para webhooks
app.post("/webhook/stripe", express.raw({ type: "application/json" }), stripeWebhook);

app.get("/", (req, res) => {
  res.send("SiteFlow Backend ativo 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
