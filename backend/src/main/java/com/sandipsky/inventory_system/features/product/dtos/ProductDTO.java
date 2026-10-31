package com.sandipsky.inventory_system.features.product.dtos;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ProductDTO {
    private int id;
    private String name;
    private String code;
    private String barcode;
    private String remarks;
    private Double costPrice;
    private Double sellingPrice;
    private Double mrp;
    private Double maxStock;
    private Double minStock;
    private String valuationMethod;

    @JsonProperty("is_batch_available")
    private boolean isBatchAvailable;

    private boolean hasExpiryDate;
    private boolean hasManufacturingDate;
    private Integer categoryId;
    private String categoryName;
    private int unitId;
    private String unitName;
    private Integer packingId;
    private String packingName;
    private Integer taxTypeId;
    private String taxTypeName;
    private double taxRate;

    @JsonProperty("is_active")
    private boolean isActive;

    private boolean isPurchasable;
    private boolean isSellable;
    private boolean isServiceItem;

    public List<String> getProductTypes() {
        List<String> types = new ArrayList<>();
        if (isPurchasable) {
            types.add("Purchasable");
        }
        if (isSellable) {
            types.add("Sellable");
        }
        return types;
    }

    private List<BonusInfoDTO> bonusInfos = new ArrayList<>();
}
