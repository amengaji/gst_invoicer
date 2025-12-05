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
  try {
    // 1. Check if Multer grabbed the file
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Check Frontend FormData key is 'expense-receipt'" });
    }

    const file = req.file;
    // Generate unique S3 key
    const s3Key = `expense-receipts/${Date.now()}-${file.originalname}`;

    // 2. Upload the buffer directly
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: file.buffer, // <--- Multer gives us this buffer
        ContentType: file.mimetype,
      })
    );

    const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    res.json({
      url,
      fileName: file.originalname,
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
};