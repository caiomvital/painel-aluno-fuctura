CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "RegistrationCourse" AS ENUM ('JAVA', 'PYTHON', 'IA');
CREATE TABLE "RegistrationRequest" (
 "id" TEXT NOT NULL,
 "userId" TEXT NOT NULL,
 "course" "RegistrationCourse" NOT NULL,
 "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
 "reviewedById" TEXT,
 "reviewedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RegistrationRequest_userId_key" ON "RegistrationRequest"("userId");
CREATE INDEX "RegistrationRequest_status_createdAt_idx" ON "RegistrationRequest"("status", "createdAt");
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
