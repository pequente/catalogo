import { digitsOnly } from "@/src/lib/wa";

export type EnderecoFields = {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  texto?: string;
};

export function normalizeCep(value: string): string {
  return digitsOnly(value).slice(0, 8);
}

export function formatCep(value: string): string {
  const d = normalizeCep(value);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function trim(value: string | undefined): string {
  return (value ?? "").trim();
}

/** Compact single-line address for footer, topbar and Sobre. */
export function formatEnderecoLinha(endereco: EnderecoFields): string {
  const logradouro = trim(endereco.logradouro);
  const numero = trim(endereco.numero);
  const complemento = trim(endereco.complemento);
  const bairro = trim(endereco.bairro);
  const cidade = trim(endereco.cidade);
  const uf = trim(endereco.uf);

  if (logradouro || numero) {
    let street = logradouro;
    if (numero) {
      street = street ? `${street}, ${numero}` : numero;
    }
    if (complemento) {
      street = street ? `${street} — ${complemento}` : complemento;
    }
    const parts: string[] = [];
    if (street) parts.push(street);
    if (bairro) parts.push(bairro);
    const cityUf = cidade && uf ? `${cidade}-${uf}` : cidade || uf;
    if (cityUf) parts.push(cityUf);
    if (parts.length > 0) return parts.join(" · ");
  }

  const legacy = trim(endereco.texto);
  if (legacy) return legacy;

  const cityUf = cidade && uf ? `${cidade}-${uf}` : cidade || uf;
  return cityUf;
}

export function syncEnderecoTexto<T extends EnderecoFields>(endereco: T): T & { texto: string } {
  return {
    ...endereco,
    texto: formatEnderecoLinha(endereco),
  };
}
