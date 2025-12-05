// server/controllers/uploadController.js
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET,
  },
});

exports.uploadExpenseReceipt = async (req, res) => {
  // --- DEBUGGING LOGS ---
  console.log("--- Upload Request Received ---");
  console.log("Content-Type Header:", req.headers['content-type']); // Must be multipart/form-data...
  console.log("Req.file:", req.file); // Should be an object, not undefined
  console.log("Req.body:", req.body); // Might be empty or contain other text fields
  // ----------------------

  try {
    if (!req.file) {
      console.error("ERROR: No file received in req.file");
      return res.status(400).json({ message: "No file uploaded. Check FormData key matches 'expense-receipt'" });
    }

    const file = req.file;
    const s3Key = `expense-receipts/${Date.now()}-${file.originalname}`;

    console.log(`Attempting S3 Upload to bucket: ${process.env.AWS_S3_BUCKET}`);

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    console.log("S3 Upload Success!");

    const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    res.json({ url, fileName: file.originalname });
    
  } catch (err) {
    console.error("CRITICAL AWS ERROR:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};