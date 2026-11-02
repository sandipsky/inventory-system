package com.sandipsky.inventory_system.features.dashboard.dtos;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Grand total of the documents dated on one day
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DateTotalDTO {
    private String date;
    private Double total;
}
