package com.sandipsky.inventory_system.features.product.services;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;
import com.sandipsky.inventory_system.features.product.dtos.BonusInfoDTO;
import com.sandipsky.inventory_system.features.product.entities.BonusInfo;
import com.sandipsky.inventory_system.features.product.repositories.ProductStockRepository;
import com.sandipsky.inventory_system.features.product.dtos.ProductStockDTO;
import com.sandipsky.inventory_system.features.product.repositories.ProductRepository;
import com.sandipsky.inventory_system.features.product.dtos.ProductDTO;
import com.sandipsky.inventory_system.features.product.entities.Product;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.util.QueryParamUtil;
import java.util.Map;
import com.sandipsky.inventory_system.features.masters.category.entities.Category;
import com.sandipsky.inventory_system.features.masters.packing.entities.Packing;
import com.sandipsky.inventory_system.features.masters.taxtype.entities.TaxType;
import com.sandipsky.inventory_system.features.masters.unit.entities.Unit;
import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.DuplicateResourceException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.features.masters.category.repositories.CategoryRepository;
import com.sandipsky.inventory_system.features.masters.packing.repositories.PackingRepository;
import com.sandipsky.inventory_system.features.masters.taxtype.repositories.TaxTypeRepository;
import com.sandipsky.inventory_system.features.masters.unit.repositories.UnitRepository;
import com.sandipsky.inventory_system.common.util.SpecificationBuilder;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductService {

    @Autowired
    private ProductRepository repository;

    @Autowired
    private ProductStockRepository productStockrepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UnitRepository unitRepository;

    @Autowired
    private PackingRepository packingRepository;

    @Autowired
    private TaxTypeRepository taxTypeRepository;

    private final SpecificationBuilder<Product> specBuilder = new SpecificationBuilder<>();

    public Product saveProduct(ProductDTO dto) {
        if (repository.existsByName(dto.getName())) {
            throw new DuplicateResourceException("Product with the same name already exists");
        }

        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            throw new BadRequestException("Product name cannot be null or blank");
        }

        if (dto.getUnitId() <= 0) {
            throw new BadRequestException("Unit is required");
        }

        if (dto.getValuationMethod() == null || dto.getValuationMethod().trim().isEmpty()) {
            throw new BadRequestException("Valuation method is required");
        }

        Product product = new Product();
        mapDtoToEntity(dto, product);
        return repository.save(product);
    }

    public Page<ProductDTO> getPaginatedProductsList(Map<String, String> params) {
        Pageable pageable = QueryParamUtil.toPageable(params);

        Map<String, String> filters = QueryParamUtil.toFilterParams(params);
        String productType = null;
        for (String key : List.copyOf(filters.keySet())) {
            if ("productType".equalsIgnoreCase(key)) {
                productType = filters.remove(key);
            }
        }

        Specification<Product> spec = specBuilder.buildSpecification(filters);
        Specification<Product> typeSpec = buildProductTypeSpec(productType);
        if (typeSpec != null) {
            spec = spec == null ? typeSpec : spec.and(typeSpec);
        }

        Page<Product> productPage = repository.findAll(spec, pageable);
        return productPage.map(this::mapToDTO);
    }

    private Specification<Product> buildProductTypeSpec(String productType) {
        if (productType == null || productType.trim().isEmpty()) {
            return null;
        }
        String normalized = productType.trim().toLowerCase();
        return switch (normalized) {
            case "purchasable" -> (root, query, cb) -> cb.isTrue(root.get("isPurchasable"));
            case "sellable" -> (root, query, cb) -> cb.isTrue(root.get("isSellable"));
            case "both" -> (root, query, cb) -> cb.and(
                    cb.isTrue(root.get("isPurchasable")),
                    cb.isTrue(root.get("isSellable")));
            default -> null;
        };
    }

    public ProductDTO getProductById(int id) {
        Product product = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return mapToDTO(product);
    }

    public ProductStockDTO getProductStockInfoById(int id) {
        Product product = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        ProductStock productStock = productStockrepository.findByProductId(id);
        ProductStockDTO productStockDTO = new ProductStockDTO();
        if (productStock == null) {
            // Never stocked yet (no opening stock or purchase): zero quantity at the product's own prices
            productStockDTO.setQuantity(0.0);
            productStockDTO.setCostPrice(product.getCostPrice());
            productStockDTO.setSellingPrice(product.getSellingPrice());
            productStockDTO.setMrp(product.getMrp());
            return productStockDTO;
        }
        productStockDTO.setId(productStock.getId());
        productStockDTO.setQuantity(productStock.getQuantity());
        productStockDTO.setCostPrice(productStock.getCostPrice());
        productStockDTO.setSellingPrice(productStock.getSellingPrice());
        productStockDTO.setMrp(productStock.getMrp());
        return productStockDTO;
    }

    public Product updateProduct(int id, ProductDTO product) {
        Product existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        if (product.getName() == null || product.getName().trim().isEmpty()) {
            throw new BadRequestException("Product name cannot be null or blank");
        }

        if (repository.existsByNameAndIdNot(product.getName(), id)) {
            throw new DuplicateResourceException("Product with the same name already exists");
        }

        mapDtoToEntity(product, existing);
        return repository.save(existing);
    }

    public void deleteProduct(int id) {
        repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        repository.deleteById(id);
    }

    private ProductDTO mapToDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setCode(product.getCode());
        dto.setBarcode(product.getBarcode());
        dto.setRemarks(product.getRemarks());
        dto.setCostPrice(product.getCostPrice());
        dto.setSellingPrice(product.getSellingPrice());
        dto.setMrp(product.getMrp());
        dto.setMaxStock(product.getMaxStock());
        dto.setMinStock(product.getMinStock());
        dto.setValuationMethod(product.getValuationMethod());
        dto.setBatchAvailable(product.isBatchAvailable());
        dto.setHasExpiryDate(product.isHasExpiryDate());
        dto.setHasManufacturingDate(product.isHasManufacturingDate());
        dto.setActive(product.isActive());
        dto.setPurchasable(product.isPurchasable());
        dto.setSellable(product.isSellable());
        dto.setServiceItem(product.isServiceItem());
        dto.setCategoryId(product.getCategory() != null ? product.getCategory().getId() : null);
        dto.setCategoryName(product.getCategory() != null ? product.getCategory().getName() : null);
        dto.setUnitId(product.getUnit() != null ? product.getUnit().getId() : 0);
        dto.setUnitName(product.getUnit() != null ? product.getUnit().getName() : null);
        dto.setPackingId(product.getPacking() != null ? product.getPacking().getId() : null);
        dto.setPackingName(product.getPacking() != null ? product.getPacking().getName() : null);
        dto.setTaxTypeId(product.getTaxType() != null ? product.getTaxType().getId() : null);
        dto.setTaxTypeName(product.getTaxType() != null ? product.getTaxType().getName() : null);
        dto.setTaxRate(product.getTaxType() != null ? product.getTaxType().getTaxRate() : 0);

        List<BonusInfoDTO> bonusInfoDTOs = new ArrayList<>();
        if (product.getBonusInfos() != null) {
            for (BonusInfo bi : product.getBonusInfos()) {
                BonusInfoDTO biDto = new BonusInfoDTO();
                biDto.setId(bi.getId());
                biDto.setMinQuantity(bi.getMinQuantity());
                biDto.setBonusQuantity(bi.getBonusQuantity());
                bonusInfoDTOs.add(biDto);
            }
        }
        dto.setBonusInfos(bonusInfoDTOs);
        return dto;
    }

    private void mapDtoToEntity(ProductDTO dto, Product product) {
        product.setName(dto.getName().trim());
        product.setCode(dto.getCode() != null ? dto.getCode().trim() : null);
        product.setBarcode(dto.getBarcode() != null ? dto.getBarcode().trim() : null);
        product.setRemarks(dto.getRemarks());
        product.setCostPrice(dto.getCostPrice());
        product.setSellingPrice(dto.getSellingPrice());
        product.setMrp(dto.getMrp());
        product.setMaxStock(dto.getMaxStock());
        product.setMinStock(dto.getMinStock());

        product.setValuationMethod(dto.getValuationMethod().trim());

        product.setBatchAvailable(dto.isBatchAvailable());
        product.setHasExpiryDate(dto.isHasExpiryDate());
        product.setHasManufacturingDate(dto.isHasManufacturingDate());
        product.setActive(dto.isActive());
        product.setPurchasable(dto.isPurchasable());
        product.setSellable(dto.isSellable());
        product.setServiceItem(dto.isServiceItem());

        Unit unit = unitRepository.findById(dto.getUnitId())
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found"));
        product.setUnit(unit);

        if (dto.getCategoryId() != null && dto.getCategoryId() > 0) {
            Category category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
            product.setCategory(category);
        } else {
            product.setCategory(null);
        }

        if (dto.getPackingId() != null && dto.getPackingId() > 0) {
            Packing packing = packingRepository.findById(dto.getPackingId())
                    .orElseThrow(() -> new ResourceNotFoundException("Packing not found"));
            product.setPacking(packing);
        } else {
            product.setPacking(null);
        }

        if (dto.getTaxTypeId() != null && dto.getTaxTypeId() > 0) {
            TaxType taxType = taxTypeRepository.findById(dto.getTaxTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Tax Type not found"));
            product.setTaxType(taxType);
        } else {
            product.setTaxType(null);
        }

        if (product.getBonusInfos() == null) {
            product.setBonusInfos(new ArrayList<>());
        } else {
            product.getBonusInfos().clear();
        }
        if (dto.getBonusInfos() != null) {
            for (BonusInfoDTO biDto : dto.getBonusInfos()) {
                BonusInfo bi = new BonusInfo();
                bi.setMinQuantity(biDto.getMinQuantity());
                bi.setBonusQuantity(biDto.getBonusQuantity());
                product.getBonusInfos().add(bi);
            }
        }
    }
}
