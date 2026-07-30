import { normalizeCep } from "@/src/lib/br/endereco";

export type ViaCepResult = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento: string;
};

type ViaCepJson = {
  erro?: true;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  complemento?: string;
};

export class ViaCepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ViaCepError";
  }
}

export async function fetchEnderecoByCep(
  cep: string,
  signal?: AbortSignal,
): Promise<ViaCepResult> {
  const digits = normalizeCep(cep);
  if (digits.length !== 8) {
    throw new ViaCepError("CEP incompleto");
  }

  let res: Response;
  try {
    res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ViaCepError("Não foi possível consultar o CEP");
  }

  if (!res.ok) {
    throw new ViaCepError("Não foi possível consultar o CEP");
  }

  const data = (await res.json()) as ViaCepJson;
  if (data.erro) {
    throw new ViaCepError("CEP não encontrado");
  }

  return {
    logradouro: (data.logradouro ?? "").trim(),
    bairro: (data.bairro ?? "").trim(),
    cidade: (data.localidade ?? "").trim(),
    uf: (data.uf ?? "").trim().toUpperCase(),
    complemento: (data.complemento ?? "").trim(),
  };
}
