import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uniqueName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filepath = path.join(process.cwd(), "public", "uploads", uniqueName);
    
    await writeFile(filepath, buffer);
    
    return NextResponse.json({ success: true, url: `/uploads/${uniqueName}` });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
