## format_data.R

library(tibble)
library(dplyr)
library(tidyr)
library(naniar)
library(stringr)
library(ggplot2)
library(ggpubr)

data <- read.csv("data/star_transects_google_ee.csv") %>%
  drop_na(fractional_calval_filename)


# test <- t$fractional_calval_filename[1]


# BLUE BAND 

data$blue_band_sf_mean <- as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B1_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B1_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B2_rep_sf_mean
  }
  val * 0.0001
})))

data$blue_band_sf_sd <- as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B1_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B1_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B2_rep_sf_sd
  }
  val * 0.0001
})))

# GREEN BAND 

data$green_band_sf_mean <- as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B2_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B2_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B3_rep_sf_mean
  }
  val * 0.0001
})))

data$green_band_sf_sd <- as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B2_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B2_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B3_rep_sf_sd
  }
  val * 0.0001
})))

# RED BAND 

data$red_band_sf_mean <- as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B3_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B3_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B4_rep_sf_mean
  }
  val * 0.0001
})))

data$red_band_sf_sd <- as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B3_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B3_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B4_rep_sf_sd
  }
  val * 0.0001
})))

# near infared

data$nearinf_band_sf_mean <-  as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B4_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B4_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B5_rep_sf_mean
  }
  val * 0.0001
}))) 

data$nearinf_sf_sd <- as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B4_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B4_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B5_rep_sf_sd
  }
  val * 0.0001
})))

# SHORT INFRARED WAVE 

data$shinf_band_sf_mean <-  as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B5_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B5_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B6_rep_sf_mean
  }
  val * 0.0001
}))) 

data$shinf_sf_sd <- as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B5_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B5_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B6_rep_sf_sd
  }
  val * 0.0001
})))

# SHORT INFRARED WAVE 2

data$shinf2_band_sf_mean <-  as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B7_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B7_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B7_rep_sf_mean
  }
  val * 0.0001
}))) 

data$shinf2_sf_sd <- as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B7_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B7_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B7_rep_sf_sd
  }
  val * 0.0001
})))

# BRIGHTNESS TEMP 

data$bright_band_sf_mean <-  as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B6_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B6_rep_sf_mean
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B10_rep_sf_mean
  }
  val * 0.0001
}))) 

data$bright_sf_sd <- as.numeric(unlist(lapply(1:nrow(data), function(x) {
  val <- NULL
  lndsat_img_name <- data[x ,]$fractional_calval_filename
  if(substr(lndsat_img_name, 1, 2) == "l7") {
    val <- data[x,]$l7_B6_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l5") {
    val <- data[x ,]$l5_B6_rep_sf_sd
  } else if(substr(lndsat_img_name, 1, 2) == "l8"){
    val <- data[x ,]$l8_B10_rep_sf_sd
  }
  val * 0.0001
})))


t <- data %>%
  select(blue_band_sf_mean, blue_band_sf_sd, green_band_sf_mean, green_band_sf_sd, red_band_sf_mean, red_band_sf_sd,
         nearinf_band_sf_mean, nearinf_sf_sd, shinf_band_sf_mean, shinf_sf_sd, shinf2_band_sf_mean, shinf2_sf_sd, bright_band_sf_mean, bright_sf_sd, 
         npv, pv, bs) %>%
  drop_na(blue_band_sf_mean) %>%
  mutate_at(c("npv", "pv", "bs"), function(x) {x/100})

#write.csv(t, file="data/model_formatted_data.csv")

train_data <- model_formatted_data[0:2039 ,]
test_data <- model_formatted_data[2040:4078, ] 

test_prediction <- read.csv("data/test_prediction.csv")
result <- as_tibble(cbind(test_data, test_prediction))

evaluation <- result %>%
  mutate_at(c("npv", "pred_npv", "pv", "pred_pv", "bs", "pred_bs"), function(x) {x * 100}) %>%
  mutate(npv_diff = npv - pred_npv, 
         pv_diff = pv - pred_pv, 
         bs_diff = bs - pred_bs)

#write.csv(train_data, file="data/model_formatted_data_train.csv")
#write.csv(test_data, file="data/model_formatted_data_test.csv")
