import { formatBrWhatsApp } from "@/src/lib/wa";
import { formatEnderecoLinha } from "@/src/lib/br/endereco";
import type { SiteConfig } from "@/src/schemas/site-config";

export type FooterPhone = {
  id: "fixo" | "celular";
  digits: string;
  label: string;
  href: string;
};

export type FooterContact = {
  address: string | null;
  hours: string | null;
  phones: FooterPhone[];
};

/** Resolve which address / hours / phone lines to show in public footers. */
export function getFooterContact(site: SiteConfig): FooterContact {
  const line = formatEnderecoLinha(site.endereco).trim();
  const address =
    site.endereco.mostrar && line ? line : null;
  const hours = site.horarios.trim() ? site.horarios.trim() : null;

  const phones: FooterPhone[] = [];
  const { telefones } = site;

  if (telefones.mostrarFixo && telefones.fixo.trim()) {
    const digits = telefones.fixo.trim();
    phones.push({
      id: "fixo",
      digits,
      label: formatBrWhatsApp(digits),
      href: `tel:+55${digits}`,
    });
  }

  const celularDigits = telefones.usarWhatsappComoCelular
    ? site.whatsapp.telefone
    : telefones.celular;
  if (telefones.mostrarCelular && celularDigits.trim()) {
    const digits = celularDigits.trim();
    phones.push({
      id: "celular",
      digits,
      label: formatBrWhatsApp(digits),
      href: `tel:+55${digits}`,
    });
  }

  return { address, hours, phones };
}

export function FooterContactBlock({
  site,
  classNames,
}: {
  site: SiteConfig;
  classNames: {
    section: string;
    title: string;
    item: string;
    label: string;
    muted: string;
  };
}) {
  const { address, hours, phones } = getFooterContact(site);
  const rodape = site.textos.rodape;
  if (!address && !hours && phones.length === 0) return null;

  return (
    <div className={classNames.section}>
      <p className={classNames.title}>{rodape.tituloContato}</p>
      {address ? (
        <p className={classNames.item}>
          <span className={classNames.label}>{rodape.labelEndereco}</span>
          <span className={classNames.muted}>{address}</span>
        </p>
      ) : null}
      {hours ? (
        <p className={classNames.item}>
          <span className={classNames.label}>{rodape.labelHorarios}</span>
          <span className={classNames.muted}>{hours}</span>
        </p>
      ) : null}
      {phones.length > 0 ? (
        <p className={classNames.item}>
          <span className={classNames.label}>{rodape.labelTelefone}</span>
          <span className={classNames.muted}>
            {phones.map((phone, i) => (
              <span key={phone.id}>
                {i > 0 ? " · " : null}
                <a href={phone.href}>{phone.label}</a>
              </span>
            ))}
          </span>
        </p>
      ) : null}
    </div>
  );
}
