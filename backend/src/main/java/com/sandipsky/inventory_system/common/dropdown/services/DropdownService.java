package com.sandipsky.inventory_system.common.dropdown.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.dropdown.dtos.DropdownDTO;
import com.sandipsky.inventory_system.features.accounting.account.repositories.AccountMasterRepository;
import com.sandipsky.inventory_system.features.masters.category.repositories.CategoryRepository;
import com.sandipsky.inventory_system.features.sales.customer.repositories.CustomerRepository;
import com.sandipsky.inventory_system.features.masters.packing.repositories.PackingRepository;
import com.sandipsky.inventory_system.features.product.repositories.ProductRepository;
import com.sandipsky.inventory_system.features.role_operations.repositories.RoleRepository;
import com.sandipsky.inventory_system.features.masters.taxtype.repositories.TaxTypeRepository;
import com.sandipsky.inventory_system.features.masters.unit.repositories.UnitRepository;
import com.sandipsky.inventory_system.features.user.repositories.UserRepository;
import com.sandipsky.inventory_system.features.purchase.vendor.repositories.VendorRepository;

import java.util.List;

@Service
public class DropdownService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private VendorRepository vendorRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AccountMasterRepository accountRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UnitRepository unitRepository;

    @Autowired
    private PackingRepository packingRepository;

    @Autowired
    private TaxTypeRepository taxTypeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    public List<DropdownDTO> getProductsDropdown(String serviceType, String type, String status) {
        Boolean isService = switch (serviceType.toLowerCase()) {
            case "service" -> true;
            case "inventory" -> false;
            default -> null; // "all"
        };
        Boolean isPurchasable = "purchasable".equalsIgnoreCase(type) ? true : null;
        Boolean isSellable = "sellable".equalsIgnoreCase(type) ? true : null;
        Boolean isActive = "active".equalsIgnoreCase(status) ? true : null;
        return productRepository.findFilteredDropdown(isService, isPurchasable, isSellable, isActive);
    }

    public List<DropdownDTO> getVendorDropdown(String status) {
        Boolean isActive = "active".equalsIgnoreCase(status) ? true : null;
        return vendorRepository.findFilteredDropdown(isActive);
    }

    public List<DropdownDTO> getCustomerDropdown(String status) {
        Boolean isActive = "active".equalsIgnoreCase(status) ? true : null;
        return customerRepository.findFilteredDropdown(isActive);
    }

    public List<DropdownDTO> getAccountMasterDropdown(String type, String partyType, String status) {
        Boolean atype = switch (type.toLowerCase()) {
            case "party" -> true;
            case "nonparty" -> false;
            default -> null; // "all"
        };
        String ptype = switch (partyType.toLowerCase()) {
            case "customer" -> "Customer";
            case "vendor" -> "Vendor";
            default -> null; // "all"
        };
        Boolean isActive = "active".equalsIgnoreCase(status) ? true : null;
        return accountRepository.findFilteredDropdown(atype, ptype, isActive);
    }

    public List<DropdownDTO> getUnitsDropdown(String status) {
        Boolean isActive = "active".equalsIgnoreCase(status) ? true : null;
        return unitRepository.findFilteredDropdown(isActive);
    }

    public List<DropdownDTO> getPackingDropdown(String status) {
        Boolean isActive = "active".equalsIgnoreCase(status) ? true : null;
        return packingRepository.findFilteredDropdown(isActive);
    }

    public List<DropdownDTO> getTaxTypeDropdown(String status) {
        Boolean isActive = "active".equalsIgnoreCase(status) ? true : null;
        return taxTypeRepository.findFilteredDropdown(isActive);
    }

    public List<DropdownDTO> getCategoryDropdown(String status) {
        Boolean isActive = "active".equalsIgnoreCase(status) ? true : null;
        return categoryRepository.findFilteredDropdown(isActive);
    }

    public List<DropdownDTO> getUserDropdown(String status) {
        Boolean isActive = "active".equalsIgnoreCase(status) ? true : null;
        return userRepository.findFilteredDropdown(isActive);
    }

    public List<DropdownDTO> getRoleDropdown(String status) {
        Boolean isActive = "active".equalsIgnoreCase(status) ? true : null;
        return roleRepository.findFilteredDropdown(isActive);
    }

}
