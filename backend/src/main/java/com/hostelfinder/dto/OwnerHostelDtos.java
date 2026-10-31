package com.hostelfinder.dto;

import java.math.BigDecimal;
import java.util.List;

public class OwnerHostelDtos {
  public record RoomTypeRequest(
    Long id,
    String roomType,
    BigDecimal pricePerMonth,
    int totalRooms,
    int availableRooms
  ) {
    public RoomTypeRequest(String roomType, BigDecimal pricePerMonth, int totalRooms, int availableRooms) {
      this(null, roomType, pricePerMonth, totalRooms, availableRooms);
    }
  }

  public record CreateHostelRequest(
    String hostelName,
    Integer cityId,
    Integer areaId,
    String addressLine,
    String description,
    String imageUrl,
    String genderType,
    boolean messAvailable,
    List<RoomTypeRequest> roomTypes,
    List<Integer> facilityIds
  ) {}

  public record UpdateHostelRequest(
    String hostelName,
    String addressLine,
    String description,
    String imageUrl,
    String genderType,
    boolean messAvailable,
    List<RoomTypeRequest> roomTypes,
    List<Integer> facilityIds
  ) {}
}
