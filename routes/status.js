const BASE44_API_KEY = process.env.BASE44_API_KEY;
const BASE44_APP_ID = "6915d9a15e101ad5f1ac6731";

export default async function statusRoute(req, res) {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ error: "Email é obrigatório." });
  }

  // Buscar o cliente pelo email
  const clienteRes = await fetch(
    `https://app.base44.com/api/apps/${BASE44_APP_ID}/entities/Cliente?email=${email}`,
    {
      headers: {
        "api_key": BASE44_API_KEY
      }
    }
  );

  const data = await clienteRes.json();

  if (!data.data || data.data.length === 0) {
    return res.status(404).json({ error: "Cliente não encontrado." });
  }

  const cliente = data.data[0];

  return res.json({
    email: cliente.email,
    plano: cliente.plano,
    subscription_status: cliente.subscription_status,
    ativo: cliente.subscription_status === "active",
    stripe_customer_id: cliente.stripe_customer_id,
    stripe_subscription_id: cliente.stripe_subscription_id,
    valor_mensal: cliente.valor_mensal,
    data_inicio_assinatura: cliente.data_inicio_assinatura
  });
}
