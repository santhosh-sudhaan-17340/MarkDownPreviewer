package com.hotel.booking.service;

import com.hotel.booking.exception.ResourceNotFoundException;
import com.hotel.booking.model.Hotel;
import com.hotel.booking.repository.HotelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Hotel Service
 * Business logic for hotel management
 */
@Service
@RequiredArgsConstructor
public class HotelService {

    private final HotelRepository hotelRepository;

    @Transactional
    public Hotel createHotel(Hotel hotel) {
        return hotelRepository.save(hotel);
    }

    public Hotel getHotelById(Long id) {
        return hotelRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Hotel not found with id: " + id));
    }

    public List<Hotel> getAllHotels() {
        return hotelRepository.findAll();
    }

    public List<Hotel> findByCity(String city) {
        return hotelRepository.findByCity(city);
    }

    public List<Hotel> searchByName(String name) {
        return hotelRepository.searchByName(name);
    }

    @Transactional
    public Hotel updateHotel(Long id, Hotel hotelDetails) {
        Hotel hotel = getHotelById(id);
        hotel.setName(hotelDetails.getName());
        hotel.setAddress(hotelDetails.getAddress());
        hotel.setCity(hotelDetails.getCity());
        hotel.setState(hotelDetails.getState());
        hotel.setCountry(hotelDetails.getCountry());
        hotel.setZipCode(hotelDetails.getZipCode());
        hotel.setPhone(hotelDetails.getPhone());
        hotel.setEmail(hotelDetails.getEmail());
        hotel.setRating(hotelDetails.getRating());
        hotel.setDescription(hotelDetails.getDescription());
        return hotelRepository.save(hotel);
    }

    @Transactional
    public void deleteHotel(Long id) {
        Hotel hotel = getHotelById(id);
        hotelRepository.delete(hotel);
    }
}
