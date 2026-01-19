import dotenv from "dotenv";
dotenv.config();

import app, { prisma } from "src/app";

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    // connect to database
    await prisma.$connect();
    console.log("Connected to database");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
  }
}

main();
