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
    "canManageProducts" BOOLEAN NOT NULL DEFAULT false,
    "canManageDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "canManageWarehouses" BOOLEAN NOT NULL DEFAULT false,
    "canManageSubscriptions" BOOLEAN NOT NULL DEFAULT false,
    "canManageUpsellRules" BOOLEAN NOT NULL DEFAULT false,
    "canManageCustomers" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("canSeeUpsellPanel", "canViewDealHealth", "canViewPipeline", "createdAt", "email", "id", "name", "passwordHash", "role") SELECT "canSeeUpsellPanel", "canViewDealHealth", "canViewPipeline", "createdAt", "email", "id", "name", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
