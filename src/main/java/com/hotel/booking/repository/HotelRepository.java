package com.hotel.booking.repository;

import com.hotel.booking.model.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Hotel Repository
 * Data access layer for Hotel entity
 */
@Repository
public interface HotelRepository extends JpaRepository<Hotel, Long> {

    List<Hotel> findByCity(String city);

    List<Hotel> findByCountry(String country);

    List<Hotel> findByCityAndCountry(String city, String country);

    @Query("SELECT h FROM Hotel h WHERE h.rating >= :minRating")
    List<Hotel> findByMinimumRating(@Param("minRating") Double minRating);

    @Query("SELECT h FROM Hotel h WHERE LOWER(h.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Hotel> searchByName(@Param("name") String name);
}
