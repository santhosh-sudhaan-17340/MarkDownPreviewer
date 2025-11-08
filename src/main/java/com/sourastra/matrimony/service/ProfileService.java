package com.sourastra.matrimony.service;

import com.sourastra.matrimony.entity.Profile;
import com.sourastra.matrimony.repository.ProfileRepository;
import com.sourastra.matrimony.repository.ProfileSpecification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProfileService {

    private final ProfileRepository profileRepository;

    @Autowired
    public ProfileService(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    public List<Profile> getAllProfiles(
            String name,
            String city,
            String gender,
            LocalDate dobFrom,
            LocalDate dobTo,
            String sortBy,
            String sortDirection
    ) {
        // Build the specification for filtering
        Specification<Profile> spec = Specification.where(ProfileSpecification.hasName(name))
                .and(ProfileSpecification.hasCity(city))
                .and(ProfileSpecification.hasGender(gender))
                .and(ProfileSpecification.hasDobBetween(dobFrom, dobTo));

        // Determine sort field
        String sortField = determineSortField(sortBy);

        // Determine sort direction
        Sort.Direction direction = "DESC".equalsIgnoreCase(sortDirection)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;

        Sort sort = Sort.by(direction, sortField);

        return profileRepository.findAll(spec, sort);
    }

    public Optional<Profile> getProfileById(Long id) {
        return profileRepository.findById(id);
    }

    public Profile createProfile(Profile profile) {
        // Check if email already exists
        if (profileRepository.existsByEmail(profile.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + profile.getEmail());
        }
        return profileRepository.save(profile);
    }

    public Profile updateProfile(Long id, Profile profileDetails) {
        Profile profile = profileRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found with id: " + id));

        // Check if email is being changed and if it already exists
        if (!profile.getEmail().equals(profileDetails.getEmail())
                && profileRepository.existsByEmail(profileDetails.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + profileDetails.getEmail());
        }

        profile.setName(profileDetails.getName());
        profile.setEmail(profileDetails.getEmail());
        profile.setPhone(profileDetails.getPhone());
        profile.setGender(profileDetails.getGender());
        profile.setDateOfBirth(profileDetails.getDateOfBirth());
        profile.setCity(profileDetails.getCity());

        return profileRepository.save(profile);
    }

    public void deleteProfile(Long id) {
        if (!profileRepository.existsById(id)) {
            throw new IllegalArgumentException("Profile not found with id: " + id);
        }
        profileRepository.deleteById(id);
    }

    private String determineSortField(String sortBy) {
        if (sortBy == null || sortBy.isEmpty()) {
            return "name";
        }

        return switch (sortBy.toLowerCase()) {
            case "city" -> "city";
            case "gender" -> "gender";
            case "dateofbirth", "dob" -> "dateOfBirth";
            default -> "name";
        };
    }
}
