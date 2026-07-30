type FieldHintProps = {
  text: string;
};

export function FieldHint({ text }: FieldHintProps) {
  return (
    <span className="admin-field-hint">
      <button type="button" className="admin-field-hint__btn" aria-label="Ajuda">
        ?
      </button>
      <span className="admin-field-hint__tooltip" role="tooltip">
        {text}
      </span>
    </span>
  );
}
