const Event = require("../models/Event");
const Seat = require("../models/Seat");

exports.getEventSeats = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện",
      });
    }

    const savedSeats = await Seat.find({
      eventId,
    }).lean();

    const seatMap = new Map();

    for (const seat of savedSeats) {
      const key = [
        String(seat.ticketTypeId),
        String(seat.sectionId),
        seat.seatNumber,
      ].join("_");

      seatMap.set(key, seat);
    }

    const ticketTypes = (event.ticketTypes || []).map((ticket) => {
      const sections = (ticket.sections || []).map((section) => {
        const seats = (section.seats || []).map((seatNumber) => {
          const key = [
            String(ticket._id),
            String(section._id),
            String(seatNumber).trim(),
          ].join("_");

          const savedSeat = seatMap.get(key);

          return {
            _id: savedSeat?._id || null,
            seatNumber: String(seatNumber).trim(),
            status: savedSeat?.status || "missing",
            reservedUntil: savedSeat?.reservedUntil || null,
          };
        });

        return {
          _id: section._id,
          name: section.name,
          isActive: section.isActive,
          seats,
        };
      });

      return {
        _id: ticket._id,
        name: ticket.name,
        price: ticket.price,
        totalQuantity: ticket.totalQuantity,
        minPerOrder: ticket.minPerOrder,
        maxPerOrder: ticket.maxPerOrder,
        sections,
      };
    });

    return res.json({
      success: true,
      eventId: event._id,
      eventName: event.name,
      seatMapUrl: event.seatMapUrl,
      ticketTypes,
    });
  } catch (error) {
    console.error("Get Event Seats Error:", error);
    next(error);
  }
};
