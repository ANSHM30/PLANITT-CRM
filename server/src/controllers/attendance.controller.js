import prisma from "../config/db.js";

export async function checkIn(req, res) {
  try {
    const userId = req.user.userId;

    const existingOpenRecord = await prisma.attendance.findFirst({
      where: { userId, checkOut: null },
    });

    if (existingOpenRecord) {
      return res.status(409).json({ error: "User is already checked in" });
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        checkIn: new Date(),
        date: new Date(),
      },
    });

    return res.status(201).json(attendance);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function checkOut(req, res) {
  try {
    const userId = req.user.userId;

    const record = await prisma.attendance.findFirst({
      where: { userId, checkOut: null },
      orderBy: { checkIn: "desc" },
    });

    if (!record) {
      return res.status(404).json({ error: "No active check-in found" });
    }

    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: { checkOut: new Date() },
    });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
