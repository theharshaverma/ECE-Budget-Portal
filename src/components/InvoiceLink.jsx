import { buildInvoiceUrl } from "../utils";

function InvoiceLink({ record }) {
  const href = buildInvoiceUrl(record.invoiceUrl);

  if (!href) {
    return <span>{record.invoice || "Not attached"}</span>;
  }

  return (
    <a className="table-link" href={href} target="_blank" rel="noreferrer">
      {record.invoice || "View Invoice"}
    </a>
  );
}

export default InvoiceLink;
