package com.parking.mlcp.repository;

import com.parking.mlcp.entity.EntryGate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EntryGateRepository extends JpaRepository<EntryGate, Long> {

    List<EntryGate> findByIsActiveTrue();

    Optional<EntryGate> findByGateName(String gateName);
}
