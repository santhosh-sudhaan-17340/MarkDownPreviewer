package com.sourastra.matrimony.repository;

import com.sourastra.matrimony.entity.Profile;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public class ProfileSpecification {

    public static Specification<Profile> hasName(String name) {
        return (root, query, criteriaBuilder) -> {
            if (name == null || name.isEmpty()) {
                return criteriaBuilder.conjunction();
            }
            return criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("name")),
                    "%" + name.toLowerCase() + "%"
            );
        };
    }

    public static Specification<Profile> hasCity(String city) {
        return (root, query, criteriaBuilder) -> {
            if (city == null || city.isEmpty()) {
                return criteriaBuilder.conjunction();
            }
            return criteriaBuilder.equal(
                    criteriaBuilder.lower(root.get("city")),
                    city.toLowerCase()
            );
        };
    }

    public static Specification<Profile> hasGender(String gender) {
        return (root, query, criteriaBuilder) -> {
            if (gender == null || gender.isEmpty()) {
                return criteriaBuilder.conjunction();
            }
            return criteriaBuilder.equal(
                    criteriaBuilder.lower(root.get("gender")),
                    gender.toLowerCase()
            );
        };
    }

    public static Specification<Profile> hasDobBetween(LocalDate dobFrom, LocalDate dobTo) {
        return (root, query, criteriaBuilder) -> {
            if (dobFrom == null && dobTo == null) {
                return criteriaBuilder.conjunction();
            }
            if (dobFrom != null && dobTo != null) {
                return criteriaBuilder.between(root.get("dateOfBirth"), dobFrom, dobTo);
            }
            if (dobFrom != null) {
                return criteriaBuilder.greaterThanOrEqualTo(root.get("dateOfBirth"), dobFrom);
            }
            return criteriaBuilder.lessThanOrEqualTo(root.get("dateOfBirth"), dobTo);
        };
    }
}
