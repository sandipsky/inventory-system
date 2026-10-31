package com.sandipsky.inventory_system.common.util;

import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class SpecificationBuilder<T> {

    public Specification<T> buildSpecification(Map<String, String> filters) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (filters != null) {
                for (Map.Entry<String, String> filter : filters.entrySet()) {
                    if (filter.getKey() != null && filter.getValue() != null) {
                        try {
                            Path<?> path = getPath(root, filter.getKey());
                            Expression<String> expression = cb.lower(path.as(String.class));
                            predicates.add(cb.like(expression, "%" + filter.getValue().toLowerCase() + "%"));
                        } catch (IllegalArgumentException e) {
                            System.out.println("Skipping unknown filter field: " + filter.getKey());
                        }
                    }
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Path<?> getPath(Root<?> root, String fieldName) {
        if (fieldName.contains(".")) {
            String[] parts = fieldName.split("\\.");
            Path<?> path = root.get(parts[0]);
            for (int i = 1; i < parts.length; i++) {
                path = path.get(parts[i]);
            }
            return path;
        } else {
            return root.get(fieldName);
        }
    }
}
