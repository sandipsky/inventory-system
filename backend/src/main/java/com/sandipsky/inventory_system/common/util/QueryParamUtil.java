package com.sandipsky.inventory_system.common.util;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public class QueryParamUtil {

    private static final Set<String> RESERVED_PARAMS = Set.of("pageIndex", "pageSize", "sort");

    private QueryParamUtil() {
    }

    public static Pageable toPageable(Map<String, String> params) {
        return PageRequest.of(
                parseIntOrDefault(params.get("pageIndex"), 0),
                parseIntOrDefault(params.get("pageSize"), 25),
                parseSort(params.get("sort")));
    }

    public static Map<String, String> toFilterParams(Map<String, String> params) {
        Map<String, String> filters = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (RESERVED_PARAMS.contains(entry.getKey())) {
                continue;
            }
            if (entry.getValue() == null || entry.getValue().isBlank()) {
                continue;
            }
            filters.put(entry.getKey(), entry.getValue());
        }
        return filters;
    }

    private static Sort parseSort(String sortParam) {
        List<Sort.Order> orders = new ArrayList<>();
        if (sortParam != null && !sortParam.isBlank()) {
            for (String part : sortParam.split(",")) {
                String[] tokens = part.trim().split(":");
                if (tokens[0].isBlank()) {
                    continue;
                }
                String field = tokens[0].trim();
                String orderType = tokens.length > 1 ? tokens[1].trim() : "asc";
                orders.add("desc".equalsIgnoreCase(orderType)
                        ? Sort.Order.desc(field).ignoreCase()
                        : Sort.Order.asc(field).ignoreCase());
            }
        }
        return orders.isEmpty() ? Sort.unsorted() : Sort.by(orders);
    }

    private static int parseIntOrDefault(String value, int defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
