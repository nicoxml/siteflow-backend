
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function (req, res) {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log("Erro no webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed":
      console.log("Pagamento concluído:", event.data.object.id);
      break;

    case "customer.subscription.updated":
      console.log("Subscrição atualizada:", event.data.object.id);
      break;

    case "customer.subscription.deleted":
      console.log("Subscrição cancelada:", event.data.object.id);
      break;
  }

  res.json({ received: true });
}
