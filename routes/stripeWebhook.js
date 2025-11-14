import Stripe from "stripe";
import fetch from "node-fetch";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// SUA API KEY DO BASE44
const BASE44_API_KEY = process.env.BASE44_API_KEY;

// ID DO APP BASE44 (está no link da sua API)
const BASE44_APP_ID = "6915d9a15e101ad5f1ac6731";

async function findClienteByEmail(email) {
  const res = await fetch(
    `https://app.base44.com/api/apps/${BASE44_APP_ID}/entities/Cliente?email=${email}`,
    {
      headers: { 
        "api_key": BASE44_API_KEY 
      }
    }
  );

  const data = await res.json();
  return data?.data?.[0] || null;
}

async function updateCliente(id, updateData) {
  const res = await fetch(
    `https://app.base44.com/api/apps/${BASE44_APP_ID}/entities/Cliente/${id}`,
    {
      method: "PUT",
      headers: {
        "api_key": BASE44_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updateData)
    }
  );

  return await res.json();
}

export default async function stripeWebhook(req, res) {
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

  // ========= EVENTO: CHECKOUT SESSION COMPLETED ===========
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const email = session.customer_details.email;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    console.log("Pagamento confirmado para:", email);

    const cliente = await findClienteByEmail(email);

    if (!cliente) {
      console.log("Nenhum cliente encontrado no Base44 com esse email.");
      return res.json({ received: true });
    }

    await updateCliente(cliente.id, {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: "active",
      plano: session.metadata.plano || "basico",
      valor_mensal: session.amount_total / 100,
      data_inicio_assinatura: new Date().toISOString().slice(0, 10),
      status: "ativo",
      observacoes: "Atualizado automaticamente via Stripe webhook"
    });

    console.log("Cliente atualizado no Base44:", cliente.id);
  }

  // ========= EVENTO: SUBSCRIPTION UPDATED ===========
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object;

    const customerId = sub.customer;
    const status = sub.status;
    const subscriptionId = sub.id;

    // Buscar email pelo Stripe
    const customer = await stripe.customers.retrieve(customerId);
    const email = customer.email;

    const cliente = await findClienteByEmail(email);
    if (!cliente) return res.json({ received: true });

    await updateCliente(cliente.id, {
      subscription_status: status,
      stripe_subscription_id: subscriptionId
    });

    console.log("Status de assinatura atualizado:", status);
  }

  // ========= EVENTO: SUBSCRIPTION CANCELED ===========
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;

    const customerId = sub.customer;
    const customer = await stripe.customers.retrieve(customerId);
    const email = customer.email;

    const cliente = await findClienteByEmail(email);
    if (!cliente) return res.json({ received: true });

    await updateCliente(cliente.id, {
      subscription_status: "canceled",
      status: "inativo",
      observacoes: "Assinatura cancelada automaticamente via webhook"
    });

    console.log("Assinatura cancelada para:", email);
  }

  return res.json({ received: true });
}
