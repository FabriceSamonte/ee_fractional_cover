# this line is not required unless you are in a notebook
# TensorFlow and tf.keras
import tensorflow as tf
from tensorflow import keras

# Helper libraries
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

training_data = pd.read_csv("data/model_formatted_data_train.csv", index_col=None)
training_data_X = training_data[['blue_band_sf_mean', 
                                'blue_band_sf_sd',
                                'green_band_sf_mean', 
                                'green_band_sf_sd',
                                'red_band_sf_mean', 
                                'red_band_sf_sd',
                                'nearinf_band_sf_mean', 
                                'nearinf_sf_sd',
                                'shinf_band_sf_mean',
                                'shinf_sf_sd', 
                                'shinf2_band_sf_mean',
                                'shinf2_sf_sd',
                                'bright_band_sf_mean', 
                                'bright_sf_sd'
                               ]]
training_data_X = np.array(training_data_X) 

training_data_Y = training_data[['npv', 'pv', 'bs']]
training_data_Y = np.array(training_data_Y)

test_data = pd.read_csv("data/model_formatted_data_test.csv", index_col=None)
test_data_X = test_data[['blue_band_sf_mean', 
                                'blue_band_sf_sd',
                                'green_band_sf_mean', 
                                'green_band_sf_sd',
                                'red_band_sf_mean', 
                                'red_band_sf_sd',
                                'nearinf_band_sf_mean', 
                                'nearinf_sf_sd',
                                'shinf_band_sf_mean',
                                'shinf_sf_sd', 
                                'shinf2_band_sf_mean',
                                'shinf2_sf_sd',
                                'bright_band_sf_mean', 
                                'bright_sf_sd'
                               ]]
test_data_X = np.array(test_data_X) 

test_data_Y = test_data[['npv', 'pv', 'bs']]
test_data_Y_cp = test_data_Y
test_data_Y = np.array(test_data_Y)

print(test_data_X)
print(test_data_Y)

## build network layout
model = tf.keras.models.Sequential()
model.add(tf.keras.layers.Dense(12, input_dim=14, activation='relu'))
model.add(tf.keras.layers.Dense(8, activation='relu'))
model.add(tf.keras.layers.Dense(3, activation='softmax'))

model.compile(optimizer='adam',
              loss='mean_squared_error',
              metrics=['MeanSquaredError'])

model.fit(test_data_X,test_data_Y,epochs=1000, batch_size=32)


val_loss,val_acc = model.evaluate(training_data_X,training_data_Y)
print(val_loss,val_acc)

t = model.predict(test_data_X)

print(t[0], test_data_Y[0])