/*
  Warnings:

  - You are about to drop the column `canManageCustomers` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `canManageDiscounts` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `canManageProducts` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `canManageSubscriptions` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `canManageUpsellRules` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `canManageWarehouses` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canViewPipeline" BOOLEAN NOT NULL DEFAULT true,
    "canViewDealHealth" BOOLEAN NOT NULL DEFAULT true,
    "canSeeUpsellPanel" BOOLEAN NOT NULL DEFAULT true,
    "canViewProducts" BOOLEAN NOT NULL DEFAULT false,
    "canEditProducts" BOOLEAN NOT NULL DEFAULT false,
    "canViewDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "canEditDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "canViewWarehouses" BOOLEAN NOT NULL DEFAULT false,
    "canEditWarehouses" BOOLEAN NOT NULL DEFAULT false,
    "canViewSubscriptions" BOOLEAN NOT NULL DEFAULT false,
    "canEditSubscriptions" BOOLEAN NOT NULL DEFAULT false,
    "canViewUpsellRules" BOOLEAN NOT NULL DEFAULT false,
    "canEditUpsellRules" BOOLEAN NOT NULL DEFAULT false,
    "canViewCustomers" BOOLEAN NOT NULL DEFAULT false,
    "canEditCustomers" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("canSeeUpsellPanel", "canViewDealHealth", "canViewPipeline", "canViewReports", "createdAt", "email", "id", "name", "passwordHash", "role") SELECT "canSeeUpsellPanel", "canViewDealHealth", "canViewPipeline", "canViewReports", "createdAt", "email", "id", "name", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
