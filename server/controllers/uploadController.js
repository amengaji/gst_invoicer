const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET
  }
});

exports.uploadExpenseReceipt = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.files.file;
    const ext = path.extname(file.name).toLowerCase();

    // Validate file size (limit 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "File too large (Max 10MB)" });
    }

    // Validate file type
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    if (!allowed.includes(ext)) {
      return res.status(400).json({ message: "Invalid file type" });
    }

    // Unique S3 filename
    const fileName = `expense-receipts/${crypto.randomUUID()}${ext}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: file.data,
      ContentType: file.mimetype
    };

    await s3.send(new PutObjectCommand(params));

    const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    res.json({
      url,
      fileName: file.name
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
};
