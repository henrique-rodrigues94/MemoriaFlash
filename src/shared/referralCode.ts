// Função PURA e isomórfica (roda igual no browser e no Node/Express) para
// derivar um código de indicação curto e determinístico a partir de um uid.
// Fica em src/shared porque tanto o cliente (para exibir o código) quanto o
// servidor (para validar um resgate) precisam gerar exatamente o mesmo valor.
export function deriveReferralCode(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  }
  return 'FM' + hash.toString(36).toUpperCase().slice(0, 6);
}
