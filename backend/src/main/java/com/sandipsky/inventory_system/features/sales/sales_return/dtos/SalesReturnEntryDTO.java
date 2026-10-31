package com.sandipsky.inventory_system.features.sales.sales_return.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SalesReturnEntryDTO {
    private int id;

    @JsonProperty("master_sales_return_id")
    private int masterSalesReturnId;

    private Double quantity;

    @JsonProperty("cost_price")
    private Double costPrice;

    @JsonProperty("selling_price")
    private Double sellingPrice;

    @JsonProperty("mrp")
    private Double mrp;

    @JsonProperty("product_id")
    private int productId;

    @JsonProperty("product_name")
    private String productName;
}
