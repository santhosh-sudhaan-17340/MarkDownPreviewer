package com.parking.mlcp.repository;

import com.parking.mlcp.entity.ParkingFloor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingFloorRepository extends JpaRepository<ParkingFloor, Long> {

    Optional<ParkingFloor> findByFloorNumber(Integer floorNumber);

    List<ParkingFloor> findAllByOrderByFloorNumberAsc();

    @Query("SELECT f FROM ParkingFloor f LEFT JOIN FETCH f.slots WHERE f.floorId = :floorId")
    Optional<ParkingFloor> findByIdWithSlots(Long floorId);
}
