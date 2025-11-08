package com.sourastra.matrimony.repository;

import com.sourastra.matrimony.entity.Interest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterestRepository extends JpaRepository<Interest, Long> {

    List<Interest> findByFromProfileId(Long fromProfileId);

    List<Interest> findByToProfileId(Long toProfileId);

    boolean existsByFromProfileIdAndToProfileId(Long fromProfileId, Long toProfileId);
}
