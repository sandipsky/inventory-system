/**
 * A row of `GET /documentNumbering`. A document's number is `prefix` followed by a running
 * number padded to `body_length` digits, counting from `start_no` up to `end_no`.
 */
export interface DocumentNumbering {
  id: number;
  /** The document type, e.g. `Purchase Entry`. */
  name: string;
  /** Like `|PE-`: the fiscal-year part before the `|` is empty. */
  prefix: string | null;
  body_length: number;
  start_no: number;
  end_no: number;
  /** Always `null`; the API doesn't fill it. */
  numbering_style: string | null;
}
