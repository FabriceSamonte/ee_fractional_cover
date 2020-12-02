## fractional_cover_component_calc.R 

library(tibble)
library(dplyr)


star_transects_data <- read.csv("data/star_transects.csv") %>% 
  mutate(
    # Overstory fractions 
    overfpc = over_g / (100 - over_b),
    overdpc = over_d / (100 - over_b),
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
    npv = 100 * (overdpc + overppc + satmiddpc + satmidbpc + satgroundnpv + satgroundcrypt),
    bs = 100 * satgroundbare
)
