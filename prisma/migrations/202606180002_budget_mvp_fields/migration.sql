-- MVP budget structure: line number, article, quantity, price, comment, and overrun reason.

ALTER TABLE "BudgetItem" ADD COLUMN "number" INTEGER;
ALTER TABLE "BudgetItem" ADD COLUMN "article" TEXT;
ALTER TABLE "BudgetItem" ADD COLUMN "quantity" REAL;
ALTER TABLE "BudgetItem" ADD COLUMN "unitPrice" REAL;
ALTER TABLE "BudgetItem" ADD COLUMN "comment" TEXT;
ALTER TABLE "BudgetItem" ADD COLUMN "overrunReason" TEXT;
