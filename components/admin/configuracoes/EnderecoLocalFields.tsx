"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { FieldHint } from "@/components/admin/FieldHint";
import {
  formatCep,
  normalizeCep,
  syncEnderecoTexto,
} from "@/src/lib/br/endereco";
import { fetchEnderecoByCep, ViaCepError } from "@/src/lib/br/viacep";
import type { SiteConfig } from "@/src/schemas/site-config";
import styles from "./ContatoPanel.module.css";

type Endereco = SiteConfig["endereco"];

function patchEndereco(
  config: SiteConfig,
  patch: Partial<Endereco>,
  onConfigChange: (next: SiteConfig) => void,
) {
  onConfigChange({
    ...config,
    endereco: syncEnderecoTexto({ ...config.endereco, ...patch }),
  });
}

export function EnderecoLocalFields({
  config,
  disabled,
  onConfigChange,
}: {
  config: SiteConfig;
  disabled?: boolean;
  onConfigChange: (next: SiteConfig) => void;
}) {
  const [cepError, setCepError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [encontrado, setEncontrado] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(config);
  const lastLookupCepRef = useRef("");
  configRef.current = config;

  const cepDigits = normalizeCep(config.endereco.cep);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCepError(null);
    setEncontrado(false);

    if (cepDigits.length !== 8 || disabled) {
      abortRef.current?.abort();
      setBuscando(false);
      return;
    }

    if (lastLookupCepRef.current === cepDigits) {
      setEncontrado(Boolean(configRef.current.endereco.logradouro.trim()));
      return;
    }

    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setBuscando(true);
      setEncontrado(false);

      fetchEnderecoByCep(cepDigits, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          const prev = configRef.current.endereco;
          onConfigChange({
            ...configRef.current,
            endereco: syncEnderecoTexto({
              ...prev,
              logradouro: data.logradouro,
              bairro: data.bairro,
              cidade: data.cidade,
              uf: data.uf,
              complemento: prev.complemento.trim()
                ? prev.complemento
                : data.complemento,
            }),
          });
          lastLookupCepRef.current = cepDigits;
          setCepError(null);
          setEncontrado(true);
        })
        .catch((e) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setEncontrado(false);
          setCepError(
            e instanceof ViaCepError ? e.message : "Erro ao buscar CEP",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setBuscando(false);
        });
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cepDigits, disabled, onConfigChange]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <>
      <div className={styles.visibilityCard}>
        <div className={styles.visibilityCopy}>
          <p className={styles.visibilityTitle}>Exibir endereço no rodapé</p>
          <p className={styles.visibilityDesc}>
            A página Sobre mostra o endereço preenchido sempre. Este interruptor
            controla só o rodapé.
          </p>
        </div>
        <label
          className="admin-switch"
          data-disabled={disabled ? "true" : undefined}
        >
          <span className="visually-hidden">Exibir endereço no rodapé</span>
          <input
            type="checkbox"
            role="switch"
            checked={Boolean(config.endereco.mostrar)}
            disabled={disabled}
            aria-label="Exibir endereço no rodapé"
            onChange={(e) =>
              patchEndereco(
                config,
                { mostrar: e.target.checked },
                onConfigChange,
              )
            }
          />
          <span className="admin-switch__track" aria-hidden="true" />
        </label>
      </div>

      <div className={styles.cepGroup}>
        <div className={styles.cepHead}>
          <div className="admin-field-label">
            CEP
            <FieldHint text="Com 8 dígitos, buscamos rua, bairro, cidade e UF automaticamente." />
          </div>
          {buscando ? (
            <span className={[styles.cepStatus, styles.cepStatusBusy].join(" ")}>
              <LoaderCircle size={13} strokeWidth={2.25} aria-hidden />
              Buscando…
            </span>
          ) : cepError ? (
            <span className={[styles.cepStatus, styles.cepStatusErr].join(" ")}>
              <TriangleAlert size={13} strokeWidth={2.25} aria-hidden />
              Não encontrado
            </span>
          ) : encontrado ? (
            <span className={[styles.cepStatus, styles.cepStatusOk].join(" ")}>
              <CheckCircle2 size={13} strokeWidth={2.25} aria-hidden />
              Endereço encontrado
            </span>
          ) : null}
        </div>

        <input
          className="input admin-config-input--sm"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          disabled={disabled}
          value={formatCep(config.endereco.cep)}
          aria-describedby={
            cepError
              ? "endereco-cep-error"
              : buscando
                ? "endereco-cep-busy"
                : undefined
          }
          onChange={(e) => {
            setCepError(null);
            setEncontrado(false);
            const cep = normalizeCep(e.target.value);
            if (cep !== normalizeCep(config.endereco.cep)) {
              lastLookupCepRef.current = "";
            }
            patchEndereco(config, { cep }, onConfigChange);
          }}
        />
        {buscando ? (
          <p className={styles.cepHint} id="endereco-cep-busy">
            Consultando o CEP e preenchendo os campos abaixo…
          </p>
        ) : null}
        {cepError ? (
          <p className="admin-alert" id="endereco-cep-error" role="alert">
            {cepError}
          </p>
        ) : (
          <p className={styles.cepHint}>
            Digite o CEP da loja. Os demais campos podem ser ajustados depois.
          </p>
        )}
      </div>

      <div className={styles.autoFields}>
        <p className={styles.autoFieldsLabel}>Preenchido pelo CEP</p>

        <label className="admin-form__span">
          <span className="admin-field-label">Logradouro</span>
          <input
            className="input"
            disabled={disabled}
            autoComplete="street-address"
            value={config.endereco.logradouro}
            onChange={(e) =>
              patchEndereco(
                config,
                { logradouro: e.target.value },
                onConfigChange,
              )
            }
          />
        </label>

        <label className="admin-form__span">
          <span className="admin-field-label">Bairro</span>
          <input
            className="input"
            disabled={disabled}
            value={config.endereco.bairro}
            onChange={(e) =>
              patchEndereco(config, { bairro: e.target.value }, onConfigChange)
            }
          />
        </label>

        <div className="admin-form__row admin-form__row--2">
          <label>
            <span className="admin-field-label">Cidade</span>
            <input
              className="input"
              disabled={disabled}
              value={config.endereco.cidade}
              onChange={(e) =>
                patchEndereco(config, { cidade: e.target.value }, onConfigChange)
              }
            />
          </label>
          <label>
            <span className="admin-field-label">UF</span>
            <input
              className="input admin-config-input--xs"
              disabled={disabled}
              maxLength={2}
              value={config.endereco.uf}
              onChange={(e) =>
                patchEndereco(
                  config,
                  { uf: e.target.value.toUpperCase() },
                  onConfigChange,
                )
              }
            />
          </label>
        </div>
      </div>

      <div className={styles.manualFields}>
        <p className={styles.autoFieldsLabel}>Complete manualmente</p>
        <div className="admin-form__row admin-form__row--2">
          <label>
            <span className="admin-field-label">Número</span>
            <input
              className="input"
              disabled={disabled}
              inputMode="numeric"
              placeholder="123"
              value={config.endereco.numero}
              onChange={(e) =>
                patchEndereco(config, { numero: e.target.value }, onConfigChange)
              }
            />
          </label>
          <label>
            <span className="admin-field-label">Complemento</span>
            <input
              className="input"
              disabled={disabled}
              placeholder="Sala, loja…"
              value={config.endereco.complemento}
              onChange={(e) =>
                patchEndereco(
                  config,
                  { complemento: e.target.value },
                  onConfigChange,
                )
              }
            />
          </label>
        </div>
      </div>
    </>
  );
}
