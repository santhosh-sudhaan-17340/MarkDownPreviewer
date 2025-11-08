package com.parking.mlcp.model;

/**
 * Enum representing different types of vehicles supported by the parking system
 */
public enum VehicleType {
    TWO_WHEELER(1.0),  // Bikes, Scooters
    CAR(2.0),          // Cars, SUVs
    TRUCK(3.0);        // Trucks, Large Vehicles

    private final double sizeFactor;

    VehicleType(double sizeFactor) {
        this.sizeFactor = sizeFactor;
    }

    public double getSizeFactor() {
        return sizeFactor;
    }

    public static VehicleType fromString(String type) {
        try {
            return VehicleType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid vehicle type: " + type);
        }
    }
}
