-- CreateTable
CREATE TABLE "VolumeDiscountRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "minLineValue" REAL NOT NULL,
    "bonusDiscountPct" REAL NOT NULL
);

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
    "canSeeUpsellPanel" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "passwordHash", "role") SELECT "createdAt", "email", "id", "name", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
