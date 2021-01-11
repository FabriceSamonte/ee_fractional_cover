## fractional_cover_component_calc.R 

library(tibble)
library(dplyr)
library(tidyr)
library(naniar)


star_transects_data <- read.csv("data/star_transects.csv", header=T, na.strings=c("", "NA")) %>% 
  mutate(
    # Overstory fractions 
    overfpc = over_g / (100 - over_b),
    overdpc = over_d / (100 - over_b),
    overbpc = over_b / (100 * (1 - overfpc - overdpc))
    overppc = (over_g + over_d + over_b) / 100,
    
    # Midstory fractions
    midppc = (mid_g + mid_d + mid_b) / 100,
    satmidfpc = (mid_g / 100) * (1 - overppc),
    satmiddpc = (mid_d / 100) * (1 - overppc),
    satmidbpc = (mid_b / 100) * (1 - overppc),
    
    # Ground cover fractions
    groundpv = green / 100,
    groundnpv = (dead + litter) / 100,
    groundbare = (crust + dist + rock) / 100,
    groundcrypt = crypto / 100,
    groundtotcov = (green + dead + litter + crust + dist + rock) / 100,
    satgroundpv = groundpv * (1 - midppc) * (1 - overppc),
    satgroundnpv = groundnpv * (1 - midppc) * (1 - overppc),
    satgroundbare = groundbare * (1 - midppc) * (1 - overppc),
    satgroundcrypt = groundcrypt * (1 - midppc) * (1 - overppc),
    
    # Fractional cover
    # pv is photosynthetic cover
    # npv is non-pv cover
    # bs is bare soil and rock
    pv = 100 * (overfpc + satmidfpc + satgroundpv),
    npv = 100 * (overdpc + overbpc + satmiddpc + satmidbpc + satgroundnpv + satgroundcrypt),
    bs = 100 * satgroundbare
) 

updated_star_transects <- read.csv("data/updated_star_transects.csv")

google_ee_data <- updated_star_transects[, 2:46] %>%
  na_if(c("No Data")) %>%
  na_if(c("No data"))


google_ee_data[colnames(google_ee_data) != "FID"] <- sapply(google_ee_data[colnames(google_ee_data) != "FID"],as.numeric) 

new_star_transects <- left_join(star_transects_data, google_ee_data,
                                by=c("FID"="FID"), 
                                all.x = TRUE)




write.csv(star_transects_data, file="data/fractional_components.csv", row.names = FALSE)

processed_data <- read.csv("data/fractional_components.csv")

colnames(processed_data)
