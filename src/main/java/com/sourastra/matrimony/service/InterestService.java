package com.sourastra.matrimony.service;

import com.sourastra.matrimony.dto.InterestRequest;
import com.sourastra.matrimony.dto.InterestResponse;
import com.sourastra.matrimony.entity.Interest;
import com.sourastra.matrimony.entity.Profile;
import com.sourastra.matrimony.repository.InterestRepository;
import com.sourastra.matrimony.repository.ProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InterestService {

    private final InterestRepository interestRepository;
    private final ProfileRepository profileRepository;

    @Autowired
    public InterestService(InterestRepository interestRepository, ProfileRepository profileRepository) {
        this.interestRepository = interestRepository;
        this.profileRepository = profileRepository;
    }

    public InterestResponse expressInterest(Long toProfileId, InterestRequest interestRequest) {
        // Validate that both profiles exist
        Profile fromProfile = profileRepository.findById(interestRequest.getFromProfileId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "From profile not found with id: " + interestRequest.getFromProfileId()));

        Profile toProfile = profileRepository.findById(toProfileId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "To profile not found with id: " + toProfileId));

        // Check if the user is trying to express interest in themselves
        if (interestRequest.getFromProfileId().equals(toProfileId)) {
            throw new IllegalArgumentException("Cannot express interest in your own profile");
        }

        // Check if interest already exists
        if (interestRepository.existsByFromProfileIdAndToProfileId(
                interestRequest.getFromProfileId(), toProfileId)) {
            throw new IllegalArgumentException(
                    "Interest already expressed from profile " + interestRequest.getFromProfileId()
                            + " to profile " + toProfileId);
        }

        // Create and save interest
        Interest interest = new Interest();
        interest.setFromProfile(fromProfile);
        interest.setToProfile(toProfile);
        interest.setMessage(interestRequest.getMessage());

        Interest savedInterest = interestRepository.save(interest);

        // Convert to response DTO
        return convertToResponse(savedInterest);
    }

    private InterestResponse convertToResponse(Interest interest) {
        InterestResponse response = new InterestResponse();
        response.setId(interest.getId());
        response.setFromProfileId(interest.getFromProfile().getId());
        response.setToProfileId(interest.getToProfile().getId());
        response.setMessage(interest.getMessage());
        response.setCreatedAt(interest.getCreatedAt());
        return response;
    }
}
