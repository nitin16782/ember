import { describe, it, expect } from "vitest";
import { paths } from "./services/media";

describe("R2 path builders", () => {
  it("attendance path includes person + monthly bucket", () => {
    const key = paths.attendance("user-abc-123");
    expect(key).toMatch(/^ember\/(dev|prod|staging)\/attendance\/\d{4}-\d{2}\/user-abc-123\/\d+\.jpg$/);
  });

  it("checklist path includes property, date, section, index", () => {
    const key = paths.checklist("prop-1", "housekeeping", 3, new Date("2026-05-13"));
    expect(key).toBe("ember/dev/checklists/prop-1/2026-05-13/housekeeping/3.jpg");
  });

  it("expense path includes property and expense ids", () => {
    const key = paths.expense("prop-1", "exp-1", new Date("2026-05-13"));
    expect(key).toBe("ember/dev/expenses/prop-1/2026-05/exp-1/bill.jpg");
  });

  it("inventory path uses generated photoId by default", () => {
    const key = paths.inventory("prop-1", "item-1");
    expect(key).toMatch(/^ember\/dev\/inventory\/prop-1\/item-1\/[0-9a-f-]{36}\.jpg$/);
  });

  it("breakage path includes index", () => {
    const key = paths.breakage("prop-1", "br-1", 2, new Date("2026-05-13"));
    expect(key).toBe("ember/dev/breakages/prop-1/2026-05/br-1/2.jpg");
  });

  it("payslip path uses cycle month", () => {
    expect(paths.payslip("person-1", "2026-05")).toBe("ember/dev/payslips/2026-05/person-1/payslip.pdf");
  });

  it("contract paths are deterministic by id", () => {
    expect(paths.contractDraft("c-1")).toBe("ember/dev/contracts/drafts/c-1.pdf");
    expect(paths.contractDraft("c-1", "html")).toBe("ember/dev/contracts/drafts/c-1.html");
    expect(paths.contractSigned("c-1")).toBe("ember/dev/contracts/signed/c-1.pdf");
  });

  it("report path uses month", () => {
    expect(paths.report("prop-1", "2026-05")).toBe("ember/dev/reports/prop-1/2026-05/report.pdf");
  });

  it("id-card path is deterministic per person", () => {
    expect(paths.idCard("person-1")).toBe("ember/dev/id-cards/person-1/card.pdf");
  });

  it("document path with custom fileId", () => {
    expect(paths.document("person-1", "id_proof", "file-123")).toBe(
      "ember/dev/documents/person-1/id_proof/file-123"
    );
  });

  it("profile photo path is deterministic per person", () => {
    expect(paths.profilePhoto("person-1")).toBe("ember/dev/profile-photos/person-1.jpg");
  });
});
