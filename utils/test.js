
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Đọc file backend/.env
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

const Event = require("../models/Event");
const Seat = require("../models/Seat");

async function testSeats() {
  try {
    // 1. Kết nối MongoDB
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL không tồn tại trong file backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected!\n");

    // 2. Lấy tất cả sự kiện
    const events = await Event.find().lean();

    console.log(`Tổng số sự kiện: ${events.length}`);

    if (events.length === 0) {
      console.log("Database chưa có sự kiện nào!");
      return;
    }

    // 3. Kiểm tra từng sự kiện
    for (const event of events) {
      console.log("\n========================================");
      console.log("TÊN SỰ KIỆN:", event.name);
      console.log("EVENT ID:", event._id);
      console.log("========================================");

      const ticketTypes = Array.isArray(event.ticketTypes)
        ? event.ticketTypes
        : [];

      if (ticketTypes.length === 0) {
        console.log("Không có cấu hình ticketTypes!");
      }

      let configuredSeats = [];

      // 4. Đọc cấu hình ghế trong Event
      for (const ticketType of ticketTypes) {
        console.log(`\nLoại vé: ${ticketType.name}`);

        const sections = Array.isArray(ticketType.sections)
          ? ticketType.sections
          : [];

        if (sections.length === 0) {
          console.log("  Chưa có khu vực (sections)!");
        }

        for (const section of sections) {
          const seats = Array.isArray(section.seats)
            ? section.seats
            : [];

          console.log(`  Khu vực: ${section.name}`);
          console.log(`  Số ghế cấu hình: ${seats.length}`);

          for (const seatNumber of seats) {
            const seat = String(seatNumber).trim();

            if (!seat) continue;

            configuredSeats.push({
              ticketTypeId: String(ticketType._id),
              ticketType: ticketType.name,
              sectionId: String(section._id),
              section: section.name,
              seatNumber: seat,
            });
          }
        }
      }

      console.log(
        "\nTổng số ghế cấu hình trong Event:",
        configuredSeats.length
      );

      // 5. Lấy ghế trong collection Seat
      const dbSeats = await Seat.find({
        eventId: event._id,
      }).lean();

      console.log(
        "Tổng số ghế trong collection Seat:",
        dbSeats.length
      );

      // 6. Thống kê trạng thái
      const statistics = {
        available: 0,
        reserved: 0,
        sold: 0,
        unknown: 0,
      };

      for (const seat of dbSeats) {
        if (statistics[seat.status] !== undefined) {
          statistics[seat.status]++;
        } else {
          statistics.unknown++;
        }
      }

      console.log("\nTHỐNG KÊ TRẠNG THÁI GHẾ:");
      console.table(statistics);

      // 7. So sánh cấu hình Event và collection Seat
      const seatKey = (ticketTypeId, sectionId, seatNumber) =>
        `${ticketTypeId}_${sectionId}_${String(seatNumber).trim()}`;

      const dbSeatKeys = new Set(
        dbSeats.map((seat) =>
          seatKey(
            seat.ticketTypeId,
            seat.sectionId,
            seat.seatNumber
          )
        )
      );

      const configuredKeys = new Set(
        configuredSeats.map((seat) =>
          seatKey(
            seat.ticketTypeId,
            seat.sectionId,
            seat.seatNumber
          )
        )
      );

      const missingSeats = configuredSeats.filter(
        (seat) =>
          !dbSeatKeys.has(
            seatKey(
              seat.ticketTypeId,
              seat.sectionId,
              seat.seatNumber
            )
          )
      );

      // Ghế trong Seat không còn nằm trong cấu hình Event
      const orphanSeats = dbSeats.filter(
        (seat) =>
          !configuredKeys.has(
            seatKey(
              seat.ticketTypeId,
              seat.sectionId,
              seat.seatNumber
            )
          )
      );

      console.log("\nKẾT QUẢ ĐỒNG BỘ:");
      console.log("Ghế cấu hình:", configuredSeats.length);
      console.log("Ghế trong database:", dbSeats.length);
      console.log("Ghế chưa được tạo:", missingSeats.length);
      console.log("Ghế không còn trong cấu hình:", orphanSeats.length);

      if (configuredSeats.length === 0) {
        console.log(
          "\nCẢNH BÁO: Event chưa có cấu hình ghế để đồng bộ!"
        );
      } else if (missingSeats.length === 0) {
        console.log("\nTẤT CẢ GHẾ ĐÃ ĐƯỢC TẠO!");
      } else {
        console.log("\nDANH SÁCH GHẾ CHƯA ĐƯỢC TẠO:");
        console.table(missingSeats);
      }

      if (orphanSeats.length > 0) {
        console.log("\nDANH SÁCH GHẾ KHÔNG CÒN TRONG CẤU HÌNH:");
        console.table(
          orphanSeats.map((seat) => ({
            seatNumber: seat.seatNumber,
            status: seat.status,
            ticketTypeId: String(seat.ticketTypeId),
            sectionId: String(seat.sectionId),
          }))
        );
      }

      // 8. Hiển thị danh sách ghế trong database
      if (dbSeats.length > 0) {
        console.log("\nDANH SÁCH GHẾ TRONG DATABASE:");

        console.table(
          dbSeats.map((seat) => ({
            seatNumber: seat.seatNumber,
            status: seat.status,
            reservedUntil: seat.reservedUntil,
            orderId: seat.orderId
              ? String(seat.orderId)
              : null,
          }))
        );
      }
    }
  } catch (error) {
    console.error("\nTest seats error:", error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("\nMongoDB disconnected!");
    }
  }
}

testSeats();
